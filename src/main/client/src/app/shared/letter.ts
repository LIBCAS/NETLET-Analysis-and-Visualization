export interface Letter {
    letter_id: number,
    origin: number,
    destination: number,
    date_year: number,
    places: Place[],
    identities: Identity[],
    identity_recipient: string[]
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
    geoname_id: number
}