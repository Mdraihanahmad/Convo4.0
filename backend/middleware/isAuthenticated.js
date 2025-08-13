import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";
const isAuthenticated = async(req,res,next) => {
  try {
    const token = req.cookies.token;
    if(!token){
        return res.status(401).json({message:"User not authenticated."})
    };
    const decode = await jwt.verify(token,process.env.JWT_SECRET_KEY);
    if(!decode){
        return res.status(401).json({message:"Invalid token"});
    };
    req.id = decode.userId;
    // attach block list to req for downstream checks
    try {
      const me = await User.findById(req.id).select('blockedContacts');
      req.blockedContacts = me?.blockedContacts?.map(id => String(id)) || [];
    } catch {}
    next();
  } catch (error) {
    console.log(error);
  }
};
export default isAuthenticated;

const req = {
    id:"",
}
req.id = "sdlbgnjdfn"