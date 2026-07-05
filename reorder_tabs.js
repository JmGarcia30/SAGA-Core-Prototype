const fs = require('fs');

function updateDashboardHtml() {
    let content = fs.readFileSync('dashboard.html', 'utf-8');

    // Update sidebars
    content = content.replace(
        /<i class="fas fa-door-open w-5 text-center text-amber-400"><\/i> Exit & Clearance/g,
        '<i class="fas fa-file-contract w-5 text-center text-amber-400"></i> Contracts & Offboarding'
    );

    // Update view header
    content = content.replace(
        /<h2 class="text-xl font-bold text-slate-900">Separations & Exit Clearances<\/h2>\s*<p class="text-xs text-slate-500">Process clearances, generate COEs, and archives profiles<\/p>/,
        '<h2 class="text-xl font-bold text-slate-900">Contracts & Offboarding</h2>\n                        <p class="text-xs text-slate-500">Manage contract renewals, process clearances, and archive profiles</p>'
    );

    // Reorder tabs
    const oldTabs = `<div class="flex gap-2">
                        <button onclick="switchExitTab('queue')" id="btnExitQueue" class="px-3.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all"><i class="fas fa-hourglass-half mr-1"></i> Clearance Queue</button>
                        <button onclick="switchExitTab('separated')" id="btnExitSeparated" class="px-3.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-xl transition-all"><i class="fas fa-archive mr-1"></i> Separated Staff</button>
                        <button onclick="switchExitTab('renewals')" id="btnExitRenewals" class="px-3.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-xl transition-all"><i class="fas fa-file-contract mr-1"></i> Contract Renewals</button>
                    </div>`;
                    
    const newTabs = `<div class="flex gap-2">
                        <button onclick="switchExitTab('renewals')" id="btnExitRenewals" class="px-3.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all"><i class="fas fa-file-contract mr-1"></i> Contract Renewals</button>
                        <button onclick="switchExitTab('queue')" id="btnExitQueue" class="px-3.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-xl transition-all"><i class="fas fa-hourglass-half mr-1"></i> Clearance Queue</button>
                        <button onclick="switchExitTab('separated')" id="btnExitSeparated" class="px-3.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-xl transition-all"><i class="fas fa-archive mr-1"></i> Separated Staff</button>
                    </div>`;

    content = content.replace(oldTabs, newTabs);

    fs.writeFileSync('dashboard.html', content, 'utf-8');
}

function updateDashboardJs() {
    let content = fs.readFileSync('dashboard_view.js', 'utf-8');

    // Change default active tab to renewals
    content = content.replace(
        /let activeExitTab = 'queue';/g,
        "let activeExitTab = 'renewals';"
    );
    
    // In view initialization, make sure renewals is rendered instead of queue initially
    content = content.replace(
        /switchExitTab\('queue'\);/,
        "switchExitTab('renewals');"
    );

    fs.writeFileSync('dashboard_view.js', content, 'utf-8');
}

updateDashboardHtml();
updateDashboardJs();
console.log('UI updated successfully');
