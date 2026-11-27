import glob
import re

files = glob.glob('frontend/src/**/*.jsx', recursive=True)
for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    if 'document.head.appendChild(style);' in content and 'removeChild(style)' not in content:
        print(f"Fixing {file}")
        # Find the useEffect block and add the cleanup function
        new_content = content.replace(
            'document.head.appendChild(style);\n        }\n    }, [isIframe]);',
            'document.head.appendChild(style);\n            return () => {\n                document.head.removeChild(link);\n                document.head.removeChild(style);\n            };\n        }\n    }, [isIframe]);'
        )
        new_content = new_content.replace(
            'document.head.appendChild(style);\n    }, []);',
            'document.head.appendChild(style);\n        return () => {\n            document.head.removeChild(link);\n            document.head.removeChild(style);\n        };\n    }, []);'
        )
        if new_content != content:
            with open(file, 'w') as f:
                f.write(new_content)
        else:
            print(f"Could not automatically fix {file}")
