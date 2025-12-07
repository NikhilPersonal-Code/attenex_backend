"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmailController = void 0;
const database_setup_1 = require("@config/database_setup");
const email_1 = require("@utils/email");
const drizzle_orm_1 = require("drizzle-orm");
const sendVerificationEmailController = async (req, res) => {
    const { email } = req.body;
    const user = (await database_setup_1.db.select().from(database_setup_1.users).where((0, drizzle_orm_1.eq)(database_setup_1.users.email, email)))[0];
    if (!user) {
        return res
            .json({
            message: "User does not exist",
            success: false,
        })
            .status(400);
    }
    if (user.isVerified) {
        return res
            .json({
            message: "User is already verified kindly sign up",
            success: false,
        })
            .status(400);
    }
    await (0, email_1.sendVerificationEmail)({
        email: user.email,
        id: user.id,
        name: user.name,
    });
    return res
        .json({
        success: true,
        message: "Email has been sended",
    })
        .status(200);
};
exports.sendVerificationEmailController = sendVerificationEmailController;
