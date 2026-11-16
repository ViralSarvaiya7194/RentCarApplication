const fs = require('fs');
let content = fs.readFileSync('src/app/app.ts', 'utf8');
content = content.replace(
  '        Day Closing\n      </a>\n    </nav>',
  `        Day Closing
      </a>
      <a (click)="logout()" class="flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 text-slate-400 cursor-pointer transition-colors">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        Logout
      </a>
    </nav>`
);
fs.writeFileSync('src/app/app.ts', content);
