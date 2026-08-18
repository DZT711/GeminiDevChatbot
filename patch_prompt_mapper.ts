import fs from 'fs';
const file = 'src/server/services/agentIntegration/context/PromptContextMapper.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `            } else if (section.type === ContextSectionType.WORKSPACE) {
                workspace += (workspace ? '\\n' : '') + section.content;
            }`;

const replacement = `            } else if (section.type === ContextSectionType.WORKSPACE) {
                workspace += (workspace ? '\\n' : '') + section.content;
            } else if (section.type === ContextSectionType.MEMORY) {
                // If memory is introduced in the future
                knowledge += (knowledge ? '\\n\\n---\\n\\n' : '') + section.content;
            }`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
