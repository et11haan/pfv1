import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const k20aId = '66779163272634375b43694f';

const updateK20Product = async () => {
    const newDescription = `
A legend in the import performance scene, the K20A is a 2.0-liter four-cylinder engine from Honda's K-series. Renowned for its high-revving capability, intelligent VTEC (i-VTEC) system, and impressive power output, it has become a popular choice for engine swaps in a wide variety of chassis. This specific variant, the K20A, is often found in the Japanese Domestic Market (JDM) versions of cars like the Civic Type R (EP3) and Integra Type R (DC5).

### Key Specifications:
- **Displacement:** 1,998 cc (2.0 L)
- **Bore and Stroke:** 86 mm x 86 mm (a "square" engine)
- **Compression Ratio:** Typically 11.5:1 or higher in Type R variants
- **Power Output:** Ranges from 212 to 221 hp depending on the specific model and year
- **Redline:** ~8,400 RPM

The i-VTEC system in the K20A is a significant advancement over earlier VTEC systems. It combines VTEC's variable valve timing and lift with Variable Timing Control (VTC), which allows for continuous adjustment of the intake camshaft timing. This results in a broader torque curve, better fuel economy, and lower emissions, all while delivering the thrilling high-RPM power VTEC is famous for.
    `;

    try {
        const response = await fetch(`${process.env.BACKEND_URL}/api/products/${k20aId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description_markdown: newDescription,
                editorUsername: 'system_update'
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const updatedProduct = await response.json();
        console.log('Product updated successfully:', updatedProduct);
    } catch (error) {
        console.error('Error updating product:', error);
    }
};

updateK20Product(); 