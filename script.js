import fs from 'fs';

const file = 'src/pages/DevEngine.tsx';
let content = fs.readFileSync(file, 'utf8');

const startIndex = content.indexOf('{settingsTab === "keys" && (');
if (startIndex === -1) throw new Error("Start not found");

// We need to find the matching closing brace/paren for the `settingsTab === "keys"` block.
// It ends with:
//                         )}
//                     </div>
//                   </div>
//                 )}
// 
//                 {settingsTab === "context" && (
const matchString = `                          </div>
                        )}
                    </div>
                  </div>
                )}`;

const endIndex = content.indexOf(matchString, startIndex);
if (endIndex === -1) throw new Error("End not found");

const extractedBlock = content.substring(startIndex, endIndex + matchString.length);

// Remove the block
content = content.replace(extractedBlock, "");

// Convert extracted block to `) : view === "keys" ? (` format
// Remove the leading `{settingsTab === "keys" && (` and trailing `)}`
let innerBlock = extractedBlock.replace('{settingsTab === "keys" && (', '').slice(0, -2);
// The inner block is wrapped in `<div className="space-y-6">`
// We should wrap it in a proper page layout: `<div className="flex-1 overflow-y-auto p-12 custom-scrollbar"><div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4">` + innerBlock + `</div></div>`

const newViewBlock = `        ) : view === "keys" ? (
          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4">
              <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-border-dim pb-8">
                <div>
                  <h1 className="text-4xl font-mono font-bold tracking-tighter text-white mb-2 uppercase">
                    Key Infrastructure
                  </h1>
                  <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest tracking-tighter opacity-60">
                    Manage Neural Keys and Model Proxies
                  </p>
                </div>
              </header>
              ` + innerBlock + `
            </div>
          </div>
`;

// Insert it before `) : view === "admin-debug" && user?.role === "ADMIN" ? (`
// Note: We need to find `        ) : view === "admin-debug" && user?.role === "ADMIN" ? (`
const insertAnchor = `        ) : view === "admin-debug" && user?.role === "ADMIN" ? (`;
content = content.replace(insertAnchor, newViewBlock + insertAnchor);

fs.writeFileSync(file, content);
console.log("Moved successfully.");
