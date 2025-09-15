import fs from 'fs';
import js2xmlparser from 'js2xmlparser';

const jsonData = JSON.parse(fs.readFileSync('output.json', 'utf8'));
const xml = js2xmlparser.parse("root", { document: jsonData });

fs.writeFileSync('output.xml', xml);

console.log('Conversion complete! output.xml created.'); 