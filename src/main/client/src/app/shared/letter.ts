export interface Letter {
    letter_id: number,
    origin: number,
    destination: number,
    date_year: number,
    places: Place[],
    identities: Identity[],
    keywords_cs: string[],
    keywords_category_cs: string[],
    identity_author: string[],
    identity_recipient: string[],
    identity_mentioned: string[]
}

export interface Place {
    role: string,
    name: string,
    place_id: number,
    geoname_id: number,
    country:string,
    note:string,
    latitude:number,
    longitude: number
}

export interface Identity {
    id: number,
    role: string,
    name: string,
    geoname_id: number,
    professions: {cs: string, en: string, id: number}[]
}