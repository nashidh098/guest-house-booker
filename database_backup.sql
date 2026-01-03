--
-- PostgreSQL database dump
--

\restrict lCMESdDC5f4KVw1DL1zRcNLKalHBAY9qThCk33WXlD5uNl6jVkJJ6Y4ClYA6Y4J

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    id_number text NOT NULL,
    room_number integer NOT NULL,
    check_in_date text NOT NULL,
    check_out_date text NOT NULL,
    total_nights integer NOT NULL,
    total_mvr integer NOT NULL,
    total_usd text NOT NULL,
    payment_slip text,
    status text DEFAULT 'Pending'::text NOT NULL,
    booking_date text NOT NULL,
    phone_number text,
    customer_notes text,
    admin_notes text,
    room_numbers text,
    extra_bed boolean DEFAULT false,
    extra_beds text,
    id_photo text
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- Name: gallery_photos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gallery_photos (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    image_url text NOT NULL,
    alt_text text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.gallery_photos OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (id, full_name, id_number, room_number, check_in_date, check_out_date, total_nights, total_mvr, total_usd, payment_slip, status, booking_date, phone_number, customer_notes, admin_notes, room_numbers, extra_bed, extra_beds, id_photo) FROM stdin;
8c1164bb-2440-44ae-9c83-9f3721ca5f85	Hhghg	35667	1	2025-12-26	2025-12-27	1	600	30.00	1766453217884-105402803.png	Pending	2025-12-23	9966633	Yjcsdhkkvcc	\N	[1]	f	[]	1766453216192-205504988.png
4b2c2ae0-4b74-4d60-812f-cce3fede6848	Ahmed	A2333	2	2025-12-24	2025-12-25	1	700	35.00	1766454828086-627375320.png	Pending	2025-12-23	52645455	Hsjshhsna	\N	[2]	t	[2]	1766454827103-311685316.png
\.


--
-- Data for Name: gallery_photos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gallery_photos (id, image_url, alt_text, display_order) FROM stdin;
08929076-5012-43c8-a534-60b854a84302	/objects/uploads/308a3ea3-1756-43ce-afbf-d27aa404ad6d	Front View	5
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password) FROM stdin;
\.


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: gallery_photos gallery_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gallery_photos
    ADD CONSTRAINT gallery_photos_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- PostgreSQL database dump complete
--

\unrestrict lCMESdDC5f4KVw1DL1zRcNLKalHBAY9qThCk33WXlD5uNl6jVkJJ6Y4ClYA6Y4J

