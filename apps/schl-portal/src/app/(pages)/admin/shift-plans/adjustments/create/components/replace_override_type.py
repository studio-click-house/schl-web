import re

filepath = r"e:\schl-web\apps\schl-portal\src\app\(pages)\admin\shift-plans\adjustments\create\components\Form.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace watchedOverrideType with watchedAdjustmentType
updated_content = content.replace("watchedOverrideType", "watchedAdjustmentType")

# Also replace creating/editing overrides endpoint url if any
updated_content = updated_content.replace("/v1/shift-plan/create", "/v1/shift-plan/adjustments/create")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(updated_content)

print("Successfully updated Form.tsx")
