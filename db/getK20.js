import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const getK20Product = async () => {
    try {
        const response = await fetch(`${process.env.BACKEND_URL}/api/products/honda-k20a-engine`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const product = await response.json();
        console.log(JSON.stringify(product, null, 2));
    } catch (error) {
        console.error('Error fetching product:', error);
    }
};

getK20Product(); 