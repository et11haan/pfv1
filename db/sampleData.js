export const sampleProducts = {
  'bmw-zf-s5d-320z': {
    _id: "653bd4a1c3b4e5e6f7d8a1b1",
    title: "BMW ZF S5D - 320Z Transmission",
    part_numbers: ["123456789", "ZF-S5D-320Z"],
    production_years: { start: 1994, end: 2016 },
    tags: ["transmissions", "e36", "bmw", "e39", "e46", "k series swaps", "5-speed", "manual"],
    images: [
      'https://i.imgur.com/NmKxXkP.jpg',
      'https://i.imgur.com/QwRtLmN.jpg',
      'https://i.imgur.com/ZxCvBnM.jpg'
    ],
    description_preview_html: "<p>The BMW ZF S5D-320Z is a 5-speed manual transmission manufactured by ZF Friedrichshafen AG. Known for its robust construction and reliability, it's commonly found in E36, E39, and E46 models.</p>",
    description_full_html: "<p>The BMW ZF S5D-320Z is a 5-speed manual transmission manufactured by ZF Friedrichshafen AG. It has been widely used in BMW models such as the E36, E39, and E46 series. Known for its robust construction and reliability, the transmission offers a torque capacity of up to 320 Nm.</p><h2>Features</h2><ul><li>All-aluminum casing for reduced weight</li><li>Synchronized gears for smooth shifting</li><li>Compatibility with multiple BMW engine configurations</li><li>Overdrive 5th gear for improved fuel efficiency</li><li>Often sought after for engine swaps (e.g., K series)</li></ul><h2>Related Parts</h2><table><thead><tr><th>Part</th><th>Part Number</th></tr></thead><tbody><tr><td>Clutch Kit</td><td>CK-001</td></tr><tr><td>Shift Lever</td><td>SL-002</td></tr><tr><td>Transmission Mounts</td><td>TM-003</td></tr><tr><td>Driveshaft</td><td>DS-E36-M</td></tr></tbody></table><p>Check the <em>Uploads</em> section for bellhousing scans.</p>",
    lowest_ask: 722.00,
    highest_bid: 672.00,
  },
  'honda-k20a-engine': {
    _id: "653bf0a1c3b4e5e6f7d8a5d1",
    title: "Honda K20A Engine (JDM Civic Type R)",
    part_numbers: ["K20A", "11000-PRC-010"],
    production_years: { start: 2001, end: 2006 },
    tags: ["engine", "honda", "k-series", "k20", "vtec", "jdm", "civic type r", "integra type r", "k-swap"],
    images: [
      'https://newparts.com/wp-content/uploads/2022/08/honda-k20-engine-review-2-1024x648.webp',
      'https://i.imgur.com/JdWzXkM.jpg',
      'https://i.imgur.com/RfGkXmP.jpg',
      'https://i.imgur.com/TvNkxWq.jpg'
    ],
    description_preview_html: "<p>The legendary K20A engine from the JDM EP3 Civic Type R and DC5 Integra Type R. High-revving, 2.0L DOHC i-VTEC power.</p>",
    description_full_html: "<p>The Honda K20A is a high-performance 2.0-liter inline-four engine from Honda's K-series family. This JDM-spec engine was specifically designed for the EP3 Civic Type R and DC5 Integra Type R, featuring Honda's advanced i-VTEC system.</p><h2>Key Specifications</h2><ul><li>Displacement: 1,998 cc</li><li>Power: ~217-220 hp @ 8,000 rpm</li><li>Torque: ~149 lb-ft @ 7,000 rpm</li><li>Redline: 8,400 RPM</li><li>Compression Ratio: 11.5:1</li><li>Bore x Stroke: 86mm x 86mm</li></ul><h2>Features</h2><ul><li>Dual overhead camshafts (DOHC)</li><li>i-VTEC system with variable valve timing and lift</li><li>High-flow intake and exhaust systems</li><li>Lightweight aluminum construction</li><li>Direct ignition system</li></ul><h2>Common Applications</h2><ul><li>2001-2006 Honda Civic Type R (EP3)</li><li>2001-2006 Honda Integra Type R (DC5)</li><li>Popular choice for engine swaps in various Honda/Acura models</li></ul>",
    lowest_ask: 4500.00,
    highest_bid: 4100.00,
  }
};

export const sampleListings = {
  'bmw-zf-s5d-320z': [
    { _id: "507f1f77bcf86cd799439013", type: 'ask', seller: 'JohnDoe', price: 722, location: 'New York, NY', 
      image: 'https://i.imgur.com/NmKxXkP.jpg', 
      description: 'Excellent condition, low mileage transmission.' },
    { _id: "507f1f77bcf86cd799439014", type: 'bid', seller: 'JaneSmith', price: 672, location: 'Los Angeles, CA', 
      image: 'https://i.imgur.com/QwRtLmN.jpg', 
      description: 'Looking for a transmission in good condition.' }
  ],
  'honda-k20a-engine': [
    { _id: "507f1f77bcf86cd799439011", type: 'ask', seller: 'KSwapKing', price: 4500, location: 'Miami, FL', 
      image: 'https://i.imgur.com/k20a1.jpg', 
      description: 'Complete JDM K20A engine with 70k miles. Includes wiring harness, ECU, and all accessories. Perfect for your swap project.' },
    { _id: "507f1f77bcf86cd799439012", type: 'bid', seller: 'EGHatchFan', price: 4100, location: 'Chicago, IL', 
      image: 'https://i.imgur.com/k20a2.jpg', 
      description: 'Looking for a clean K20A for my EG hatch build. Must be complete with all sensors and wiring.' }
  ]
};

export const sampleComments = {
  'bmw-zf-s5d-320z': [],
  'honda-k20a-engine': [
    { 
      user: 'K20Master', 
      text: 'Been working with K20As for over a decade. Pro tip: The PRB head on these JDM Type R engines flows significantly better than the USDM RSX-S head. Factory port work and the larger intake valves (35mm vs 34mm) make a huge difference. Also check the oil pump chain tensioner when buying used - common wear item.',
      timestamp: '2024-02-20T15:30:00Z'
    },
    { 
      user: 'HondaTuner', 
      text: 'Important note for anyone doing a K-swap: Make sure to get the correct ECU for your setup. The JDM ECU is great but needs conversion for USDM sensors. I recommend using a Ktuner or Hondata system for better compatibility. My EP3 made 245whp with just bolt-ons and a proper tune.',
      timestamp: '2024-02-20T16:45:00Z'
    },
    {
      user: 'SwapSpecialist',
      text: 'For those wondering about transmission compatibility - these came with either 5 or 6 speed depending on the chassis. The 6-speed from the DC5 Type R is the strongest, with carbon synchros and better gear ratios. Highly recommend grabbing one if you can find it.',
      timestamp: '2024-02-20T17:15:00Z'
    }
  ]
}; 