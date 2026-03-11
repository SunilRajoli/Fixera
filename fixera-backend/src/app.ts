import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.routes';
import bookingRouter from './routes/booking.routes';
import jobRouter from './routes/job.routes';
import slotRouter from './routes/slot.routes';
import adminRouter from './routes/admin.routes';
import paymentRouter from './routes/payment.routes';
import walletRouter from './routes/wallet.routes';
import disputeRouter from './routes/dispute.routes';
import reviewRouter from './routes/review.routes';
import notificationRouter from './routes/notification.routes';
import serviceRouter from './routes/service.routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/slots', slotRouter);
app.use('/api/admin', adminRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/disputes', disputeRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/services', serviceRouter);

app.use(errorHandler);

export default app;

