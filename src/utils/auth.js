"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectOauthProvider = void 0;
const googleAuth_1 = require("@controllers/auth/providers/googleAuth");
const linkedInAuth_1 = require("@controllers/auth/providers/linkedInAuth");
const selectOauthProvider = (authType, req, res) => {
    switch (authType) {
        case "google":
            return (0, googleAuth_1.googleAuth)(req, res);
        case "linkedin":
            return (0, linkedInAuth_1.linkedInAuth)(req, res);
        default:
            return null;
    }
};
exports.selectOauthProvider = selectOauthProvider;
