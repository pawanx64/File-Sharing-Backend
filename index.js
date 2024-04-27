const express=require("express");
const app=express();
const cors=require("cors");
app.use(
    cors({
        origin:["https://skyboxshare.vercel.app"],
        methods:["POST","GET"],
        credentials: true,
    })
);

require("dotenv").config();

const PORT=process.env.PORT || 6000;
app.use(express.json());

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