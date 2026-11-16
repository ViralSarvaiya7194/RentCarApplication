param(
    [Parameter(Mandatory=$false)]
    [string]$PrinterName = "",
    
    [Parameter(Mandatory=$false)]
    [string]$FilePath = "",

    [Parameter(Mandatory=$false)]
    [string]$ImagePath = "",

    [Parameter(Mandatory=$false)]
    [switch]$CheckOnly,

    [Parameter(Mandatory=$false)]
    [switch]$ListPrinters
)

# 1. Output list of installed printers as JSON if requested
if ($ListPrinters) {
    try {
        $printers = Get-Printer | Select-Object Name, PortName, DriverName, PrinterStatus, Default
        $list = @()
        foreach ($p in $printers) {
            $isUsb = ($p.PortName -match "USB") -or ($p.DriverName -match "POS|Receipt|Thermal")
            $list += [PSCustomObject]@{
                name = $p.Name
                port = $p.PortName
                driver = $p.DriverName
                status = [string]$p.PrinterStatus
                isDefault = [bool]$p.Default
                isUsb = [bool]$isUsb
            }
        }
        $list | ConvertTo-Json -Compress
        exit 0
    } catch {
        Write-Error "Failed to list printers: $_"
        exit 1
    }
}

# 2. Raw Spooler P/Invoke Definition
$typeDef = @'
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool CheckPrinter(string szPrinterName, out string error) {
        error = "";
        IntPtr hPrinter = IntPtr.Zero;
        if (!OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            int err = Marshal.GetLastWin32Error();
            error = "Printer '" + szPrinterName + "' not found or cannot be opened (Win32 error: " + err + ")";
            return false;
        }
        ClosePrinter(hPrinter);
        return true;
    }

    public static bool SendFileToPrinter(string szPrinterName, string szFileName, out string error) {
        error = "";
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Thermal Receipt";
        di.pDataType = "RAW";

        if (!OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            int err = Marshal.GetLastWin32Error();
            error = "Printer '" + szPrinterName + "' not found or offline (Win32 error: " + err + ")";
            return false;
        }

        bool success = false;
        try {
            byte[] bytes = File.ReadAllBytes(szFileName);
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
                    Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
                    int dwWritten = 0;
                    success = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                } else {
                    error = "Could not start page on printer '" + szPrinterName + "'";
                }
                EndDocPrinter(hPrinter);
            } else {
                error = "Could not start document on printer '" + szPrinterName + "'";
            }
        } catch (Exception ex) {
            error = ex.Message;
        } finally {
            ClosePrinter(hPrinter);
        }
        return success;
    }
}
'@

if (-not ([System.Management.Automation.PSTypeName]'RawPrinterHelper').Type) {
    Add-Type -TypeDefinition $typeDef
}

# 3. Resolve printer name to installed Windows printer if possible
$targetPrinter = $PrinterName.Trim()
$allPrinters = @(Get-Printer)

$found = $null
if ($targetPrinter) {
    # 3.1 Exact match
    $found = $allPrinters | Where-Object { $_.Name -ieq $targetPrinter } | Select-Object -First 1
    
    # 3.2 Substring match if exact match not found
    if (-not $found) {
        $found = $allPrinters | Where-Object { $_.Name -like "*$targetPrinter*" } | Select-Object -First 1
    }

    # 3.3 If user passed generic placeholder label, map to first installed thermal printer
    if (-not $found -and ($targetPrinter -ieq "Counter 1 Thermal Printer" -or $targetPrinter -ieq "DEFAULT_PRINTER" -or $targetPrinter -ieq "Default Printer" -or $targetPrinter -ieq "USB" -or $targetPrinter -ieq "ALL")) {
        $found = $allPrinters | Where-Object { $_.Name -match "^(POS-80|BILL|KCH|RECEIPT|XP-80|EPSON)" -or $_.DriverName -match "POS-80" } | Select-Object -First 1
    }
} else {
    # No name passed: pick default or first thermal printer
    $found = $allPrinters | Where-Object { $_.Default -eq $true } | Select-Object -First 1
    if (-not $found) {
        $found = $allPrinters | Where-Object { $_.Name -match "^(POS-80|BILL|KCH|RECEIPT|XP-80|EPSON)" -or $_.DriverName -match "POS-80" } | Select-Object -First 1
    }
}

if ($found) {
    $targetPrinter = $found.Name
}

$err = ""
if ($CheckOnly) {
    if (-not $found) {
        Write-Error "USB Printer '$PrinterName' is not connected or not found in Windows."
        exit 1
    }
    $ok = [RawPrinterHelper]::CheckPrinter($targetPrinter, [ref]$err)
    if ($ok) {
        Write-Output "OK:$targetPrinter"
        exit 0
    } else {
        Write-Error "USB Printer '$targetPrinter' is unavailable ($err)"
        exit 1
    }
}

if (-not $FilePath -or -not (Test-Path $FilePath)) {
    Write-Error "File path not specified or file does not exist: $FilePath"
    exit 2
}

if (-not $found) {
    Write-Error "USB Printer '$PrinterName' is not connected or not found in Windows."
    exit 3
}

# 4. Detect if target printer is a GDI / PDF / XPS / PORTPROMPT virtual document printer
$isGdiOrPortPrompt = ($found.PortName -match "PORTPROMPT|FILE|PROMPT|XPS|nul") -or ($found.DriverName -match "PDF|XPS|OneNote|Microsoft")

if ($isGdiOrPortPrompt -and $ImagePath -and (Test-Path $ImagePath)) {
    $img = $null
    $printDoc = $null
    try {
        Add-Type -AssemblyName System.Drawing
        $img = [System.Drawing.Image]::FromFile($ImagePath)
        $printDoc = New-Object System.Drawing.Printing.PrintDocument
        $printDoc.PrinterSettings.PrinterName = $targetPrinter
        $printDoc.DocumentName = "Thermal Receipt"
        $printDoc.OriginAtMargins = $false
        $printDoc.PrintController = New-Object System.Drawing.Printing.StandardPrintController

        $script:currentSrcY = 0

        $printDoc.add_PrintPage({
            param($sender, $e)
            $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $e.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $e.Graphics.Clear([System.Drawing.Color]::White)

            $marginTop = 24
            $marginBottom = 24
            $marginSide = 24

            $pageW = if ($e.PageBounds.Width -gt 0) { $e.PageBounds.Width } else { 827 }
            $pageH = if ($e.PageBounds.Height -gt 0) { $e.PageBounds.Height } else { 1169 }

            $availW = [Math]::Max(200, $pageW - ($marginSide * 2))
            $availH = [Math]::Max(300, $pageH - ($marginTop + $marginBottom))

            # Render thermal receipt at clean 80mm/58mm width centered on the PDF page
            $targetThermalW = if ($img.Width -le 400) { 260.0 } else { 350.0 }
            $destW = [Math]::Min([double]$availW, $targetThermalW)
            $scale = $destW / [double]$img.Width

            $maxSrcHPerPage = [Math]::Max(100, [int][Math]::Floor($availH / $scale))
            $remainingSrcH = $img.Height - $script:currentSrcY
            $sliceSrcH = [Math]::Min($maxSrcHPerPage, $remainingSrcH)

            $destH = [int][Math]::Round($sliceSrcH * $scale)
            $destX = [int][Math]::Round(($pageW - $destW) / 2.0)
            $destY = $marginTop

            $destRect = New-Object System.Drawing.Rectangle($destX, $destY, [int][Math]::Round($destW), $destH)
            $srcRect = New-Object System.Drawing.Rectangle(0, $script:currentSrcY, $img.Width, $sliceSrcH)

            $e.Graphics.DrawImage($img, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

            $script:currentSrcY += $sliceSrcH
            if ($script:currentSrcY -lt $img.Height) {
                $e.HasMorePages = $true
            } else {
                $e.HasMorePages = $false
            }
        })

        $printDoc.Print()
        $img.Dispose()
        $printDoc.Dispose()
        Write-Output "SUCCESS:$targetPrinter"
        exit 0
    } catch {
        if ($img) { try { $img.Dispose() } catch {} }
        if ($printDoc) { try { $printDoc.Dispose() } catch {} }
        Write-Error "GDI/PDF Printer '$targetPrinter' print error: $($_.Exception.Message)"
        exit 4
    }
}

$ok = [RawPrinterHelper]::SendFileToPrinter($targetPrinter, $FilePath, [ref]$err)
if ($ok) {
    Write-Output "SUCCESS:$targetPrinter"
    exit 0
} else {
    Write-Error "USB Printer '$targetPrinter' print error: $err"
    exit 4
}
