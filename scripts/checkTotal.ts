import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.NEXT_PUBLIC_DATA_PORTAL_KEY || process.env.DATA_PORTAL_KEY;
const standardBaseUrl = 'http://api.data.go.kr/openapi/tn_pubr_public_lftm_lrn_lctre_api';

async function checkTotalCount() {
    const url = `${standardBaseUrl}?serviceKey=${API_KEY}&pageNo=1&numOfRows=1&type=json`;
    const response = await fetch(url);
    const data: any = await response.json();
    console.log('API Response Header:', JSON.stringify(data.response.header, null, 2));
    console.log('API Total Count:', data.response.body.totalCount);
}

checkTotalCount();
