CREATE TYPE "public"."condition" AS ENUM('New', 'Used');--> statement-breakpoint
CREATE TABLE "auctions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" varchar(1000),
	"starting_bid" integer NOT NULL,
	"category" varchar(100) NOT NULL,
	"condition" "condition" NOT NULL,
	"current_bid" integer DEFAULT 0,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"image_public_id" varchar(255) NOT NULL,
	"image_url" varchar(255) NOT NULL,
	"created_by" integer NOT NULL,
	"highest_bidder_id" integer,
	"commission_calculated" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"id" serial PRIMARY KEY NOT NULL,
	"auction_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"user_name" varchar(255),
	"profile_image" varchar(255),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_proofs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"image_public_id" varchar(255) NOT NULL,
	"image_url" varchar(255) NOT NULL,
	"status" varchar DEFAULT 'Pending',
	"amount" integer,
	"comment" varchar(1000),
	"uploaded_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_name" varchar(40) NOT NULL,
	"password" varchar(255) NOT NULL,
	"email" varchar(255),
	"address" varchar(255),
	"phone" varchar(11),
	"profile_image_public_id" varchar(255) NOT NULL,
	"profile_image_url" varchar(255) NOT NULL,
	"payment_methods" json,
	"role" varchar NOT NULL,
	"unpaid_commission" integer DEFAULT 0,
	"auctions_won" integer DEFAULT 0,
	"money_spent" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;