import { Request, Response } from "express";
import { classes, db } from "../../config/database_setup";

export const getAllClasses = async (req: Request, res: Response) => {
  try {
    const allClasses = await db.select().from(classes);
    res.status(200).json({
      success: true,
      data: allClasses,
    });
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch classes",
    });
  }
};
