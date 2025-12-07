CREATE TYPE "public"."attendance_method" AS ENUM('manual', 'auto', 'oauth');--> statement-breakpoint
CREATE TYPE "public"."lecture_status" AS ENUM('active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('teacher', 'student');--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lecture_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"marked_at" timestamp with time zone DEFAULT now(),
	"method" "attendance_method" DEFAULT 'auto',
	"location_snapshot" jsonb,
	"extra" jsonb
);
--> statement-breakpoint
CREATE TABLE "attendance_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lecture_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"attempt_time" timestamp with time zone DEFAULT now(),
	"provided_passcode" varchar(4),
	"distance_meters" numeric,
	"success" boolean NOT NULL,
	"failure_reason" text,
	"ip_address" text,
	"device_info" jsonb
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"teacher_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lectures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"title" text NOT NULL,
	"passcode" varchar(4) NOT NULL,
	"passcode_expires_at" timestamp with time zone,
	"passcode_refreshed_at" timestamp with time zone DEFAULT now(),
	"status" "lecture_status" DEFAULT 'active',
	"teacher_latitude" numeric(10, 7),
	"teacher_longitude" numeric(10, 7),
	"geofence_radius" numeric DEFAULT '50',
	"created_at" timestamp with time zone DEFAULT now(),
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" "user_role",
	"class_id" uuid,
	"password_hash" text,
	"oauth_provider" text,
	"oauth_id" text,
	"is_verified" boolean DEFAULT false,
	"otp" varchar(6),
	"otp_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_attempts" ADD CONSTRAINT "attendance_attempts_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_attempts" ADD CONSTRAINT "attendance_attempts_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_unique_idx" ON "attendance" USING btree ("lecture_id","student_id");--> statement-breakpoint
CREATE INDEX "attendance_lecture_idx" ON "attendance" USING btree ("lecture_id");--> statement-breakpoint
CREATE INDEX "attendance_student_idx" ON "attendance" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "attempts_lecture_idx" ON "attendance_attempts" USING btree ("lecture_id");--> statement-breakpoint
CREATE INDEX "attempts_student_idx" ON "attendance_attempts" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "classes_teacher_idx" ON "classes" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "lectures_teacher_status_idx" ON "lectures" USING btree ("teacher_id","status");--> statement-breakpoint
CREATE INDEX "lectures_class_idx" ON "lectures" USING btree ("class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_class_idx" ON "users" USING btree ("class_id");