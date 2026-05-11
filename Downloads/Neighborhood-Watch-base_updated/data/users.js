import { users } from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
const saltRounds = 16;

export function checkString(val, type) {
    if (!val) throw `${type} was not supplied.`;
    if (typeof val !== "string") throw `${type} must be a string.`;

    val = val.trim();

    if (val.length === 0) throw `${type} cannot be an empty string.`;

    return val;
}

export function checkName(val, type) {
    val = checkString(val, type);

    if (val.length < 2) throw `${type} must be at least 2 characters long.`;
    if (val.length > 25) throw `${type} cannot be more than 25 characters long.`;

    let validchars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-'";

    for (let i = 0; i < val.length; i++) {
        if (!validchars.includes(val[i])) throw `${type} can only contain letters, hyphens, or apostrophes.`;
    }

    return val;
}

export function checkEmail(val) {
    val = checkString(val, "email");
    val = val.toLowerCase();

    let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) throw `email must be a valid email address.`;

    return val;
}

export function checkGender(val) {
    val = checkString(val, "gender");

    if (val === "prefer not to say") return "";

    let validGenders = ["M", "F", "NB"];
    if (!validGenders.includes(val)) throw `gender must be M, F, NB, or prefer not to say.`;

    return val;
}

export function checkAge(val) {
    if (val === undefined || val === null) throw `age was not supplied.`;

    let ageNum = Number(val);

    if (!Number.isInteger(ageNum)) throw `age must be a valid whole number.`;
    if (ageNum < 16 || ageNum > 100) throw `age must be between 16 and 100.`;

    return ageNum;
}

export function checkStreet(val) {
    val = checkString(val, "street");

    if (val.length < 3) throw `street must be at least 3 characters long.`;
    if (val.length > 100) throw `street cannot be more than 100 characters long.`;

    let validchars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,#-'";

    for (let i = 0; i < val.length; i++) {
        if (!validchars.includes(val[i])) throw `street contains invalid characters.`;
    }

    return val;
}

export function checkCity(val) {
    val = checkString(val, "city");

    if (val.length < 2) throw `city must be at least 2 characters long.`;
    if (val.length > 50) throw `city cannot be more than 50 characters long.`;

    let validchars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ -";

    for (let i = 0; i < val.length; i++) {
        if (!validchars.includes(val[i])) throw `city can only contain letters, spaces, or hyphens.`;
    }

    return val;
}

export function checkState(val) {
    val = checkString(val, "state").toUpperCase();

    let states = [
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
        "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
        "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
        "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
        "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
        "DC"
    ];

    if (!states.includes(val)) throw `state must be a valid US state abbreviation.`;

    return val;
}

export function checkZipCode(val) {
    val = checkString(val, "zipCode");

    if (!/^\d{5}$/.test(val)) throw `zipCode must be a valid 5 digit US zip code.`;

    return val;
}

export function checkAddress(val) {
    if (!val) throw `address was not supplied.`;
    if (typeof val !== "object" || Array.isArray(val)) throw `address must be an object.`;

    return {
        Street: checkStreet(val.Street),
        City: checkCity(val.City),
        State: checkState(val.State),
        zipCode: checkZipCode(val.zipCode)
    };
}

export function checkPassword(val) {
    if (!val) throw `password was not supplied.`;
    if (typeof val !== "string") throw `password must be a string.`;

    if (val.trim().length === 0) throw `password cannot be just spaces.`;
    if (val.includes(" ")) throw `password cannot contain spaces.`;
    if (val.length < 8) throw `password must be at least 8 characters long.`;

    let hasUpper = false;
    let hasNumber = false;
    let hasSpecial = false;

    let uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let numbers = "0123456789";
    let special = "!@#$%^&*()_+-=[]{}|;:',.<>?/`~\\\"";

    for (let i = 0; i < val.length; i++) {
        if (uppercase.includes(val[i])) hasUpper = true;
        if (numbers.includes(val[i])) hasNumber = true;
        if (special.includes(val[i])) hasSpecial = true;
    }

    if (!hasUpper) throw `password must contain at least one uppercase letter.`;
    if (!hasNumber) throw `password must contain at least one number.`;
    if (!hasSpecial) throw `password must contain at least one special character.`;

    return val;
}

export function getCurrentDate() {
    let today = new Date();

    let month = (today.getMonth() + 1).toString();
    let day = today.getDate().toString();
    let year = today.getFullYear().toString();

    if (month.length === 1) month = "0" + month;
    if (day.length === 1) day = "0" + day;

    return `${month}-${day}-${year}`;
}

export async function createUser(firstName, lastName, email, gender, age, address, password) {
    if (firstName === undefined || lastName === undefined || email === undefined || gender === undefined || age === undefined || address === undefined || password === undefined) {
        throw `You must supply exactly 7 arguments.`;
    }

    firstName = checkName(firstName, "firstName");
    lastName = checkName(lastName, "lastName");
    email = checkEmail(email);
    gender = checkGender(gender);
    age = checkAge(age);
    address = checkAddress(address);
    password = checkPassword(password);

    const userCollection = await users();

    const existingUser = await userCollection.findOne({ email: email });
    if (existingUser) throw `There is already a user with that email.`;

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    let newUser = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        gender: gender,
        age: age,
        address: address,
        hashedPassword: hashedPassword,
        role: "user",
        trustRating: 5,
        filedReports: [],
        verifiedReports: [],
        watchListZip: [address.zipCode],
        accountMade: getCurrentDate()
    };

    const insertInfo = await userCollection.insertOne(newUser);
    if (!insertInfo.acknowledged || !insertInfo.insertedId) throw `Could not add user.`;

    return { userCreated: true };
}

export async function authenticateUser(email, password) {
    if (email === undefined || password === undefined) {
        throw `You must supply exactly 2 arguments.`;
    }

    email = checkEmail(email);
    password = checkPassword(password);

    const userCollection = await users();

    const user = await userCollection.findOne({ email: email });
    if (!user) throw `Either the email or password is invalid.`;

    if(user.role == "banned") throw 'Your account has been banned'

    let compareMatch = false;

    try {
        compareMatch = await bcrypt.compare(password, user.hashedPassword);
    } catch (e) {
        compareMatch = false;
    }

    if (!compareMatch) throw `Either the email or password is invalid.`;

    return {
        _id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        gender: user.gender,
        age: user.age,
        address: user.address,
        role: user.role,
        trustRating: user.trustRating,
        filedReports: user.filedReports,
        verifiedReports: user.verifiedReports,
        watchListZip: user.watchListZip,
        accountMade: user.accountMade
    };
}

export async function removeUser(userId) {
    if (userId === undefined) {
        throw `You must supply exactly 1 argument.`;
    }

    userId = checkString(userId, "userId");

    if (!ObjectId.isValid(userId)) {
        throw `userId is not a valid ObjectId.`;
    }

    const userCollection = await users();

    const currentUser = await userCollection.findOne({
        _id: new ObjectId(userId)
    });

    if (!currentUser) {
        throw `User not found.`;
    }

    const deletionInfo = await userCollection.deleteOne({
        _id: new ObjectId(userId)
    });

    if (deletionInfo.deletedCount === 0) {
        throw `Could not remove user.`;
    }

    return {
        userRemoved: true
    };
}

export async function updateProfile(userId, firstName, lastName, email, gender, age, address) {
    if (userId === undefined || firstName === undefined || lastName === undefined || email === undefined || gender === undefined || age === undefined || address === undefined) {
        throw `You must supply exactly 7 arguments.`;
    }

    userId = checkString(userId, "userId");

    if (!ObjectId.isValid(userId)) {
        throw `userId is not a valid ObjectId.`;
    }

    firstName = checkName(firstName, "firstName");
    lastName = checkName(lastName, "lastName");
    email = checkEmail(email);
    gender = checkGender(gender);
    age = checkAge(age);
    address = checkAddress(address);

    const userCollection = await users();

    const currentUser = await userCollection.findOne({
        _id: new ObjectId(userId)
    });

    if (!currentUser) {
        throw `User not found.`;
    }

    const existingEmailUser = await userCollection.findOne({
        email: email
    });

    if (existingEmailUser && existingEmailUser._id.toString() !== userId) {
        throw `There is already a user with that email.`;
    }

    let updatedUser = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        gender: gender,
        age: age,
        address: address,
        watchListZip: [address.zipCode]
    };

    const updateInfo = await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: updatedUser }
    );

    if (updateInfo.matchedCount === 0) {
        throw `Could not update user.`;
    }
    const user = await userCollection.findOne({
        _id: new ObjectId(userId)
    });

    return {
        _id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        gender: user.gender,
        age: user.age,
        address: user.address,
        role: user.role,
        trustRating: user.trustRating,
        filedReports: user.filedReports,
        verifiedReports: user.verifiedReports,
        watchListZip: user.watchListZip,
        accountMade: user.accountMade
    };
}

export async function addZipToWatchList(userId, zipCode) {
    if (userId === undefined || zipCode === undefined) {
        throw `You must supply exactly 2 arguments.`;
    }

    userId = checkString(userId, "userId");

    if (!ObjectId.isValid(userId)) {
        throw `userId is not a valid ObjectId.`;
    }

    zipCode = checkZipCode(zipCode);

    const userCollection = await users();

    const currentUser = await userCollection.findOne({
        _id: new ObjectId(userId)
    });

    if (!currentUser) {
        throw `User not found.`;
    }

    if (currentUser.watchListZip && currentUser.watchListZip.includes(zipCode)) {
        throw `That zip code is already in your watch list.`;
    }

    const updateInfo = await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $addToSet: { watchListZip: zipCode } }
    );

    if (updateInfo.matchedCount === 0) {
        throw `Could not update watch list.`;
    }

    const updatedUser = await userCollection.findOne({
        _id: new ObjectId(userId)
    });

    return {
        _id: updatedUser._id.toString(),
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        gender: updatedUser.gender,
        age: updatedUser.age,
        address: updatedUser.address,
        role: updatedUser.role,
        trustRating: updatedUser.trustRating,
        filedReports: updatedUser.filedReports,
        verifiedReports: updatedUser.verifiedReports,
        watchListZip: updatedUser.watchListZip,
        accountMade: updatedUser.accountMade
    };
}

export async function getAllUsers() {
    const userCollection = await users();

    const allUsers = await userCollection.find({}).toArray();

    let userList = [];

    for (let i = 0; i < allUsers.length; i++) {
        userList.push([
            allUsers[i].firstName + " " + allUsers[i].lastName,
            allUsers[i]._id.toString()
        ]);
    }

    return userList;
}

export async function getUserById(userId) {
    if (userId === undefined) throw `You must supply exactly 1 argument.`;

    userId = checkString(userId, "userId");

    if (!ObjectId.isValid(userId)) throw `userId is not a valid ObjectId.`;

    const userCollection = await users();

    const user = await userCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) throw `User not found.`;

    return {
        _id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        gender: user.gender,
        age: user.age,
        address: user.address,
        role: user.role,
        trustRating: user.trustRating,
        watchListZip: user.watchListZip,
        accountMade: user.accountMade
    };
}

export async function adminUser(userId) {
    if (userId === undefined) {
        throw `You must supply exactly 1 argument.`;
    }

    userId = checkString(userId, "userId");

    if (!ObjectId.isValid(userId)) {
        throw `userId is not a valid ObjectId.`;
    }

    const userCollection = await users();

    const currentUser = await userCollection.findOne({
        _id: new ObjectId(userId)
    });

    if (!currentUser) {
        throw `User not found.`;
    }

    if (currentUser.role === "admin") {
        throw `User is already an admin.`;
    }

    const updateInfo = await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { role: "admin" } }
    );

    if (updateInfo.matchedCount === 0) {
        throw `Could not upgrade user to admin.`;
    }

    return { adminUpdated: true };
}

export async function banUser(userId) {
    if (userId === undefined) {
        throw `You must supply exactly 1 argument.`;
    }

    userId = checkString(userId, "userId");

    if (!ObjectId.isValid(userId)) {
        throw `userId is not a valid ObjectId.`;
    }

    const userCollection = await users();

    const currentUser = await userCollection.findOne({
        _id: new ObjectId(userId)
    });

    if (!currentUser) {
        throw `User not found.`;
    }

    if (currentUser.role === "banned") {
        throw `User is already banned.`;
    }

    const updateInfo = await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { role: "banned" } }
    );

    if (updateInfo.matchedCount === 0) {
        throw `Could not ban user.`;
    }

    return { userBanned: true };
}
