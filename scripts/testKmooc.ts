import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });
const API_KEY = process.env.NEXT_PUBLIC_DATA_PORTAL_KEY || process.env.DATA_PORTAL_KEY;

async function testKmooc() {
    const baseUrl = 'https://apis.data.go.kr/B552881/kmooc_v2_0/courseList_v2_0';
    // Use https or http based on what works. Let's try https first.
    const url = `${baseUrl}?serviceKey=${API_KEY}&MobileOS=ETC&MobileApp=LocalLeaning&pageNo=1&numOfRows=2`;

    console.log('Fetching:', url.replace(API_KEY!, 'SECRET'));

    try {
        const response = await fetch(url);
        const textData = await response.text();
        console.log("Raw Response start:", textData.substring(0, 300));

        try {
            const data = JSON.parse(textData);
            console.log("Parsed JSON:", JSON.stringify(data, null, 2));
        } catch (e) {
            console.error("Failed to parse JSON");
        }
    } catch (e) {
        console.error(e);
    }
}

testKmooc();
