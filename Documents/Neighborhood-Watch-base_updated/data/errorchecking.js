import { ObjectId } from 'mongodb';

const string_checker = (string) => {
    if (string === undefined){
        throw "Error: string is undefined";
    }
    if (typeof string !== "string"){
        throw "Error: string is not of type string";
    }
    string = string.trim();
    if (string.length === 0){
        throw "Error: string is empty";
    }
    return string;
}

const id_checker = (id) => {
    if (id === undefined){
        throw "Error: id does not exist";
    }
    if (typeof id !== 'string'){
        throw "Error: id is not of type string";
    }
    let id_stripped = id.trim();
    if (id_stripped.length === 0){
        throw "Error: id is an empty string";
    }
    if (!ObjectId.isValid(id_stripped)){
        throw "Error: invalid objectid";
    }
    return id_stripped;
}

export{
    string_checker,
    id_checker
}