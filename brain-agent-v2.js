/**
 * BRAIN v2 — Simplified Loop Reasoning
 */

const http = require('http');

async function callOllama(prompt, maxTokens = 100) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'gemma2:2b',
      prompt,
      stream: false,
      options: { num_predict: maxTokens }
    });
    
    const req = http.request({
      hostname: '127.0.0.1', port: 11434, path: '/api/generate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body).response || ''); }
        catch (e) { resolve(''); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function brainV2(task) {
  console.log('\n🧠 BRAIN v2 — Loop Reasoning');
  console.log('='.repeat(40));
  
  const maxDepth = 3;
  const threshold = 0.8;
  
  // Prelude
  console.log('\n[Prelude] Initial analysis...');
  const prelude = await callOllama(`Brief analysis of: ${task}. Output one line: "Analysis: ..."`, 50);
  console.log(`  → ${prelude.substring(0, 80)}`);
  
  // Recurrent Block (2 loops max)
  let converged = false;
  let state = prelude;
  let depth = 0;
  
  while (depth < maxDepth && !converged) {
    depth++;
    console.log(`\n[Loop ${depth}/${maxDepth}] Deep reasoning...`);
    
    const loopResult = await callOllama(`Based on: "${state.substring(0, 100)}"
Think deeper about: ${task}
Output: "Decision: ... (confident/low)"`, 80);
    
    console.log(`  → ${loopResult.substring(0, 100)}`);
    
    // Simple convergence check
    if (loopResult.toLowerCase().includes('confident') || depth >= 2) {
      converged = true;
    }
    state = loopResult;
  }
  
  // Coda
  console.log(`\n[Coda] Final conclusion...`);
  const coda = await callOllama(`Given these thoughts:
1. ${prelude.substring(0, 80)}
2. ${state.substring(0, 80)}
Final decision for: ${task}
Output one line: "DECISION: ..."`, 60);
  
  console.log('\n' + '='.repeat(40));
  console.log(`✅ BRAIN v2 Result: ${coda.substring(0, 150)}`);
  
  return { conclusion: coda, depth, converged };
}

// CLI
const task = process.argv.slice(2).join(' ') || 'Should MyCompi send emails to current leads?';
brainV2(task).then(r => {
  console.log(`\n📊 Depth: ${r.depth} | Converged: ${r.converged}`);
  process.exit(0);
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
