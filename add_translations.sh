#!/bin/bash

# Script pour ajouter totalPinnedTabs dans toutes les langues

declare -A translations=(
    ["pt"]="Abas fixadas"
    ["ru"]="Закрепленные вкладки"
    ["ja"]="固定タブ"
    ["zh_CN"]="固定标签页"
    ["pl"]="Przypięte karty"
    ["ar"]="التبويبات المثبتة"
    ["tr"]="Sabitlenmiş sekmeler"
    ["ko"]="고정된 탭"
    ["nl"]="Vastgezette tabbladen"
    ["id"]="Tab yang dipasang"
)

for lang in "${!translations[@]}"; do
    file="_locales/$lang/messages.json"
    if [ -f "$file" ]; then
        echo "Processing $lang..."
        
        # Backup
        cp "$file" "$file.bak2"
        
        # Find the line with eligibleTabs and add after its closing brace
        awk -v translation="${translations[$lang]}" '
        /^  "eligibleTabs": {/ { in_eligible = 1 }
        in_eligible && /^  },/ {
            print $0
            print "  \"totalPinnedTabs\": {"
            print "    \"message\": \"" translation "\""
            print "  },"
            in_eligible = 0
            next
        }
        { print }
        ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        
        echo "Added: ${translations[$lang]}"
    fi
done
