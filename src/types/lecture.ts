export interface Lecture {
    id: string; // lctreCo
    title: string; // lctreNm
    instructor: string; // instrctorNm
    period: string; // edcBgnde ~ edcEndde
    target: string; // edcTrget
    link: string; // rceptSiteUrl
    lat: number | null; // latitude
    lng: number | null; // longitude
    address: string; // edcPlc
}
