# Kiddie Kruzzer POS - IIS Deployment Guide

## Package Contents
- wwwroot/ : Production Angular frontend with web.config URL Rewrite & API Reverse Proxy.
- server/ : Node.js Express server, PostgreSQL schema migrations, thermal printer canvas engine.
- INSTALL-AND-RUN-IIS.ps1 : Automated 1-click PowerShell installer for IIS and Windows Services.

## System Prerequisites
1. Windows Server 2016/2019/2022 or Windows 10/11 Pro/Enterprise
2. IIS (Internet Information Services) installed
3. URL Rewrite Module 2.1: https://www.iis.net/downloads/microsoft/url-rewrite
4. Application Request Routing (ARR) 3.0: https://www.iis.net/downloads/microsoft/application-request-routing
   - In IIS Manager -> Application Request Routing -> Server Proxy Settings -> Check Enable proxy.
5. Node.js (v18+) and PostgreSQL (v14+)

## Quick 1-Click Deployment
1. Open PowerShell as Administrator.
2. Run:
   cd <folder_where_package_is_extracted>
   .\\INSTALL-AND-RUN-IIS.ps1
3. Open browser at http://localhost:8080.
