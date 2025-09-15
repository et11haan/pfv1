import fetch from 'node-fetch';

const k20aId = "67f7665a33224424d58eb3fc";
const testMarkdown = `This is a test update.

## Test Header
* Test bullet point 1
* Test bullet point 2

Regular paragraph here.`;

async function updateK20Description() {
  try {
    console.log('Sending update request...');
    const response = await fetch(`http://localhost:3001/api/products/${k20aId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description_markdown: testMarkdown
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Full server response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error updating description:', error);
    if (error.response) {
      console.error('Response body:', await error.response.text());
    }
  }
}

updateK20Description(); 