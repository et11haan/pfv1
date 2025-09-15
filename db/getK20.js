import fetch from 'node-fetch';

async function getK20Product() {
  try {
    const response = await fetch('http://localhost:3001/api/products/honda-k20a-engine');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('K20A Product Data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error fetching product:', error);
  }
}

getK20Product(); 