import { Router } from "express";
import { z } from "zod";
import { getHotelOffers } from "../services/hotel.service";

export const hotelRouter = Router();
const querySchema = z.object({
  city: z.string().trim().min(1).max(100).transform((value) => value.toLocaleLowerCase()),
  minPrice: z.coerce.number().finite().nonnegative().optional(),
  maxPrice: z.coerce.number().finite().nonnegative().optional()
}).refine((query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice, {
  message: "minPrice must be less than or equal to maxPrice", path: ["minPrice"]
});

hotelRouter.get("/hotels", async (req, res, next) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten().fieldErrors });
  try {
    const { city, minPrice, maxPrice } = parsed.data;
    return res.json(await getHotelOffers(city, minPrice, maxPrice));
  } catch (error) {
    return next(error);
  }
});
