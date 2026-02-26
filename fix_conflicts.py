import sys

def resolve_ours(filepath):
    print(f"Resolving conflicts for {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    out_lines = []
    in_head = False
    in_other = False
    for line in lines:
        if line.startswith('<<<<<<< HEAD'):
            in_head = True
            continue
        elif line.startswith('======='):
            in_head = False
            in_other = True
            continue
        elif line.startswith('>>>>>>>'):
            in_other = False
            in_head = False
            continue
            
        if in_head:
            out_lines.append(line)
        elif in_other:
            pass
        else:
            out_lines.append(line)
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(out_lines)

if __name__ == '__main__':
    resolve_ours('c:/Users/User/Documents/arccovps-master/backend/agents/orchestrator.py')
    resolve_ours('c:/Users/User/Documents/arccovps-master/backend/agents/tools.py')
    resolve_ours('c:/Users/User/Documents/arccovps-master/backend/agents/prompts.py')
    print("Done.")
