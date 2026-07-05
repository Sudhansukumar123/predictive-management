import py_compile
import glob
import os

def check_compilation():
    print("Initiating Python static compile check...")
    files = glob.glob('**/*.py', recursive=True)
    has_errors = False
    
    for f in files:
        # Skip virtualenv directories
        if 'venv' in f or '.venv' in f:
            continue
            
        try:
            py_compile.compile(f, doraise=True)
            print(f"  [PASS] {f}")
        except Exception as e:
            print(f"  [FAIL] Syntax error in {f}: {e}")
            has_errors = True
            
    if has_errors:
        print("Static compilation failed. Syntax errors found in python files.")
        exit(1)
    else:
        print("Static compile check passed! All python files are syntax-free.")

if __name__ == "__main__":
    check_compilation()
