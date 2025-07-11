import nodemailer from "nodemailer";

export const nodemailerMailgun = nodemailer.createTransport({
  host: "smtp.mailgun.org",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAILGUN_USERNAME || "",
    pass: process.env.MAILGUN_PASSWORD || "",
  },
});
