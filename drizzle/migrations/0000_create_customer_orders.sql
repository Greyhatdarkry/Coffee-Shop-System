CREATE TABLE public.customer_orders (
 id uuid PRIMARY KEY,
 order_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 items jsonb NOT NULL,
 total integer NOT NULL CHECK (total > 0),
 status text NOT NULL DEFAULT 'received' CHECK (status = 'received'),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.customer_orders TO service_role;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.submit_customer_order(request_id uuid, lines jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
 line jsonb; product jsonb; prepared jsonb := '[]'; amount integer := 0;
 quantity integer; sugar integer; saved public.customer_orders;
 catalog jsonb := '{"latte":{"name":"Signature Latte","price":65,"drink":true},"croissant":{"name":"Butter Croissant","price":50,"drink":false},"iced":{"name":"Iced Spanish Latte","price":70,"drink":true},"avocado":{"name":"Avocado Toast","price":70,"drink":false},"matcha":{"name":"Iced Matcha Latte","price":65,"drink":true},"berry":{"name":"Berry Hibiscus Tea","price":60,"drink":true}}';
BEGIN
 IF request_id IS NULL OR jsonb_typeof(lines) <> 'array' OR jsonb_array_length(lines) NOT BETWEEN 1 AND 22 THEN RAISE EXCEPTION 'Invalid order'; END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(lines) LOOP
  product := catalog -> (line ->> 'id');
  IF product IS NULL OR jsonb_typeof(line->'qty') <> 'number' OR (line->>'qty') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Invalid item'; END IF;
  quantity := (line->>'qty')::integer;
  IF quantity NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  sugar := NULL;
  IF (product->>'drink')::boolean THEN
   IF jsonb_typeof(line->'sugar') <> 'number' OR (line->>'sugar') NOT IN ('0','25','50','75','100') THEN RAISE EXCEPTION 'Invalid sugar level'; END IF;
   sugar := (line->>'sugar')::integer;
  ELSE
   IF line->'sugar' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'Food cannot have sugar selection'; END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(prepared) p WHERE p->>'id' = line->>'id' AND p->'sugar' = coalesce(to_jsonb(sugar),'null'::jsonb)) THEN RAISE EXCEPTION 'Duplicate item'; END IF;
  prepared := prepared || jsonb_build_array(jsonb_build_object('id',line->>'id','name',product->>'name','price',(product->>'price')::integer,'qty',quantity,'sugar',sugar));
  amount := amount + quantity * (product->>'price')::integer;
 END LOOP;
 INSERT INTO public.customer_orders(id,items,total) VALUES(request_id,prepared,amount) ON CONFLICT(id) DO NOTHING;
 SELECT * INTO saved FROM public.customer_orders WHERE id = request_id;
 IF saved.items <> prepared THEN RAISE EXCEPTION 'Order reference already used'; END IF;
 RETURN jsonb_build_object('id',saved.id,'number',saved.order_number,'items',saved.items,'total',saved.total,'status',saved.status,'createdAt',saved.created_at);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_customer_order(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_customer_order(uuid,jsonb) TO anon, authenticated, service_role;