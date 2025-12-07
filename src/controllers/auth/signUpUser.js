"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signUpUser = void 0;
require("dotenv/config");
const emailSignUp_1 = require("./providers/emailSignUp");
const auth_1 = require("@utils/auth");
const signUpUser = async (req, res) => {
    // Prefer authType from body (POST), fallback to query string
    const authType = req.query.authType.toString();
    const oauthResult = (0, auth_1.selectOauthProvider)(authType, req, res);
    if (oauthResult !== null)
        return oauthResult;
    if (authType === "email") {
        return (0, emailSignUp_1.emailSignUp)(req, res);
    }
    else {
        return res.status(400).json({
            success: false,
            message: "Invalid authType parameter",
        });
    }
};
exports.signUpUser = signUpUser;
