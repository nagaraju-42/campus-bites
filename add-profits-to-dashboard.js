const fs = require('fs');
let code = fs.readFileSync('src/app/admin/dashboard/page.tsx', 'utf8');

// Add import
code = code.replace(
  "import OnlineUsersCounter from '@/components/shop/OnlineUsersCounter'",
  "import OnlineUsersCounter from '@/components/shop/OnlineUsersCounter'\nimport ProfitAnalytics from '@/components/admin/ProfitAnalytics'"
);

// Add the component section above "Recent Activity" or below the late orders
const componentToInject = `
        {/* Profit Analytics */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Profit Analytics</h2>
          <ProfitAnalytics />
        </div>
`;

code = code.replace(
  "{/* Main Content Area */}\n      <div className=\"flex-1 p-4 md:p-8 overflow-auto\">",
  "{/* Main Content Area */}\n      <div className=\"flex-1 p-4 md:p-8 overflow-auto\">\n" + componentToInject
);

fs.writeFileSync('src/app/admin/dashboard/page.tsx', code);
console.log("Added profit analytics to dashboard!");