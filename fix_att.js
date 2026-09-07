const fs = require('fs')
const c = fs.readFileSync('src/views/AttendanceTeacher.vue', 'utf8')
const lines = c.split('\n')
// Remove lines 190-207 (0-indexed: 189-206) which are leftover CSV code
// Line 189 is "  const BOM = ''"
// Line 207 is "}"
// We need to find and remove these lines
let startIdx = -1
let endIdx = -1
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const BOM =") && lines[i+1] && lines[i+1].includes("let csv = BOM")) {
    startIdx = i
  }
  if (startIdx >= 0 && lines[i].includes("a.href = url; a.download = '考勤记录_'") && lines[i].includes('.csv')) {
    // Next line should be "}"
    endIdx = i + 1
    break
  }
}
console.log('Removing lines', startIdx+1, 'to', endIdx+1)
if (startIdx >= 0 && endIdx >= 0) {
  lines.splice(startIdx, endIdx - startIdx + 1)
  fs.writeFileSync('src/views/AttendanceTeacher.vue', lines.join('\n'), 'utf8')
  console.log('Done! Removed CSV leftover code.')
} else {
  console.log('Could not find CSV code to remove')
}
