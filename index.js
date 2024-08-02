const express=require("express");
const app=express();
const cors=require("cors");
const bodyParser = require('body-parser');
require("dotenv").config();

app.use(
    cors({
        origin:["https://skyboxshare.vercel.app"],
        methods:["POST","GET"],
        credentials: true,
    })
);


const PORT=process.env.PORT || 6000;
app.use(express.json());

app.use(bodyParser.json({ limit: "50mb" })); 
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true })); 

const cloudinary=require("./Config/Cloudinary");
cloudinary.cloudinaryConnect();


const Routes=require("./Route/Route");
app.use("",Routes);



app.listen(5000,()=>{
    console.log(`Server Started Succesfully at 5000`);
})


const dbConnect=require("./Config/Database");
dbConnect();

app.get("/",(req,res)=>{
    res.send(`<h1>This Is HomePage</h1>`);
})