const express = require("express");
const app = express();
const cors = require("cors");
const connectDatabase= require("./config/db");
const userRoutes = require("./src/routes/userRoutes");
const noteRoutes= require("./src/routes/noteRoutes")
const path = require("path");
connectDatabase()

require("dotenv").config({path: "config/.env"});


app.use(express.json());
app.use(cors());



app.use("/api/",userRoutes)
app.use("/api/", noteRoutes)


app.get("/", (req,res)=>{
    res.send("Hello")
})




app.listen(3000, ()=>{
    console.log(`Server is running on port 3000`);
})