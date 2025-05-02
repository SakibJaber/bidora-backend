ALTER TABLE "auctions" ALTER COLUMN "start_time" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "auctions" ALTER COLUMN "start_time" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "auctions" ALTER COLUMN "end_time" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "auctions" ALTER COLUMN "end_time" SET NOT NULL;