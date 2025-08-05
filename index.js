const express=require("express");
const app=express();
const cors=require("cors");
const bodyParser = require('body-parser');
const passport = require('passport');
const session = require('express-session');
require("dotenv").config();

app.use(
    cors({
        origin:["https://skyboxshare.vercel.app"],
        methods:["POST","GET", "DELETE"], // Added DELETE method for file deletion https://skyboxshare.vercel.app
        credentials: true,
    })
);

// Use the PORT variable for consistency
const PORT=process.env.PORT || 6000;
app.use(express.json());

app.use(bodyParser.json({ limit: "50mb" })); 
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true })); 

const cloudinary=require("./Config/Cloudinary");
cloudinary.cloudinaryConnect();

const Routes=require("./Route/Route");
app.use("/api",Routes);

app.use(session({
    secret: process.env.SESSION_SECRET || 'your_default_secret',
    resave: false,
    saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

// Use the PORT variable here
app.listen(PORT,()=>{
    console.log(`Server Started Succesfully at ${PORT}`);
});


const dbConnect=require("./Config/Database");
dbConnect();

app.get("/",(req,res)=>{
    res.send(`<h1>This Is HomePage</h1>`);
});
