import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import userRouter from "./user";
import productsRouter from "./products";
import servicesRouter from "./services";
import billingRouter from "./billing";
import ticketsRouter from "./tickets";
import domainsRouter from "./domains";
import kbRouter from "./knowledgebase";
import notificationsRouter from "./notifications";
import affiliateRouter from "./affiliate";
import apiTokensRouter from "./api-tokens";
import publicRouter from "./public";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/products", productsRouter);
router.use("/services", servicesRouter);
router.use("/billing", billingRouter);
router.use("/tickets", ticketsRouter);
router.use("/domains", domainsRouter);
router.use("/kb", kbRouter);
router.use("/notifications", notificationsRouter);
router.use("/affiliate", affiliateRouter);
router.use("/api-tokens", apiTokensRouter);
router.use("/public", publicRouter);
router.use("/admin", adminRouter);

export default router;
