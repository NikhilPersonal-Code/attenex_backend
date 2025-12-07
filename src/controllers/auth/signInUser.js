"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signInUser = void 0;
const emailSignIn_1 = require("./providers/emailSignIn");
const auth_1 = require("@utils/auth");
const signInUser = async (req, res) => {
    // Prefer auth type from request body for POST; allow query fallback
    const authType = req.query.authType.toString();
    const oauthResult = (0, auth_1.selectOauthProvider)(authType, req, res);
    if (oauthResult !== null)
        return oauthResult;
    if (authType === "email") {
        return (0, emailSignIn_1.emailSignIn)(req, res);
    }
    else {
        return res.status(400).json({
            success: false,
            message: "Invalid authType parameter; expected 'email'|'google'|'linkedin'",
        });
    }
};
exports.signInUser = signInUser;
