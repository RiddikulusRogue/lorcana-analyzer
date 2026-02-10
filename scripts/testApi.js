import https from 'https';

const url = 'https://api.lorcana-api.com/cards/all';

console.log('Fetching from', url);

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            console.log('Response type:', typeof parsed, Array.isArray(parsed) ? 'array' : 'object');
            console.log('Response keys:', Object.keys(parsed).slice(0, 10));

            if (Array.isArray(parsed)) {
                console.log('First card:', JSON.stringify(parsed[0], null, 2));
            } else if (parsed.data) {
                console.log('Has data key, first item:', JSON.stringify(parsed.data[0], null, 2));
            } else if (parsed.cards) {
                console.log('Has cards key, first item:', JSON.stringify(parsed.cards[0], null, 2));
            } else {
                console.log('Structure sample:', JSON.stringify(Object.entries(parsed).slice(0, 1)[0], null, 2));
            }
        } catch (e) {
            console.log('Parse error:', e.message);
            console.log('First 500 chars:', data.substring(0, 500));
        }
    });
}).on('error', (e) => {
    console.error('Fetch error:', e);
});
