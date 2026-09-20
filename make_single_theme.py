import sys

with open('src/app/student/menu/[shopId]/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove theme logic
content = content.replace("const isRenukaTheme = shop?.name.toLowerCase().includes('renuka') || shop?.name.toLowerCase().includes('street 11');", "")
content = content.replace("const isBakeryTheme = shop?.name.toLowerCase().includes('baker') || shop?.name.toLowerCase().includes('sweet') || shop?.name.toLowerCase().includes('softy');", "")
content = content.replace("const theme = isRenukaTheme ? 'renuka' : isBakeryTheme ? 'bakery' : 'default';", "")

# 2. Extract the renuka theme inner content
# The renuka theme block starts with           {theme === 'renuka' && (
renuka_start_marker = "          {/* Renuka Theme (Split layout) */}\n          {theme === 'renuka' && (\n            <div className=\"bg-[#F6EAD5] min-h-screen\">\n"
start_idx = content.find(renuka_start_marker)
if start_idx == -1:
    print("Could not find renuka theme start")
    sys.exit(1)

# The bakery theme starts after renuka theme
bakery_start_marker = "{/* Bakery Theme */}"
end_idx = content.find(bakery_start_marker)

if end_idx == -1:
    print("Could not find bakery theme start")
    sys.exit(1)

# Extract renuka block (removing the {theme === 'renuka' && ( wrapper)
# We actually just want the inner <div className="bg-[#F6EAD5] min-h-screen"> ... </div>
renuka_block = content[start_idx + len("          {/* Renuka Theme (Split layout) */}\n          {theme === 'renuka' && (\n"):end_idx]
renuka_block = renuka_block.strip()
# Remove the closing )} at the very end of renuka block
if renuka_block.endswith(")}"):
    renuka_block = renuka_block[:-2].strip()

# Now we need to delete everything from default theme start to the end of the file's dynamic list layout,
# and replace it with just the renuka block.

dynamic_list_start = "          {/* 🌟 Dynamic Themed List Layout 🌟 */}"
dyn_start_idx = content.find(dynamic_list_start)

# The end of all themes is right before       {/* 🌟 Tab Bar: Menu | Reviews | Info 🌟 */}
# Wait, the themes are inside ctiveTab === 'Menu', so it ends before       {activeTab === 'Reviews' && ( ... no, it ends at </> for the menu tab!
# Let's find where the activeTab === 'Menu' block ends.
# It's easier: just replace from dyn_start_idx to the end of bakery theme.

bakery_end_str = "          )}\n        </>\n      )}\n    </div>"
# wait, I'll just find the exact text
