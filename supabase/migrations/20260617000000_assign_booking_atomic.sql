-- assign_booking_atomic: locks booking row, creates assignment + bed rows,
-- confirms the booking. The EXCLUDE constraint on assignment_beds is the
-- physical backstop against double-booking.
create or replace function assign_booking_atomic(
  p_booking_request_id uuid,
  p_admin_id           uuid,
  p_bed_ids            uuid[],
  p_notes              text default null
) returns void
language plpgsql
security definer
as $$
declare
  v_booking  booking_requests%rowtype;
  v_assign   uuid;
  v_bed_id   uuid;
begin
  -- Lock the booking row to prevent concurrent confirmation.
  select * into v_booking
  from booking_requests
  where id = p_booking_request_id
  for update;

  if not found then
    raise exception 'booking not found' using errcode = 'P0001';
  end if;

  if v_booking.status <> 'pending' then
    raise exception 'booking is not pending (status=%)', v_booking.status
      using errcode = 'P0001';
  end if;

  -- Create the assignment record.
  insert into booking_assignments (
    booking_request_id, house_id, family_id,
    check_in_date, check_out_date, attendee_count,
    status, notes, assigned_by
  ) values (
    p_booking_request_id, v_booking.house_id, v_booking.family_id,
    v_booking.check_in_date, v_booking.check_out_date, v_booking.attendee_count,
    'confirmed', p_notes, p_admin_id
  )
  returning id into v_assign;

  -- Insert one assignment_beds row per bed. The EXCLUDE constraint fires here
  -- if any bed is already occupied for the overlapping date range.
  foreach v_bed_id in array p_bed_ids loop
    insert into assignment_beds (
      booking_assignment_id, bed_id,
      check_in_date, check_out_date,
      is_active
    ) values (
      v_assign, v_bed_id,
      v_booking.check_in_date, v_booking.check_out_date,
      true
    );
  end loop;

  -- Confirm the request.
  update booking_requests
  set status = 'confirmed'
  where id = p_booking_request_id;

  -- Audit log.
  insert into booking_events (
    booking_request_id, house_id, actor_id, event_type,
    new_value
  ) values (
    p_booking_request_id, v_booking.house_id, p_admin_id, 'confirmed',
    jsonb_build_object('bed_ids', p_bed_ids, 'assignment_id', v_assign)
  );
end;
$$;

-- Grant execute to authenticated users; API routes run as service-role which
-- always bypasses RLS, but the function is security definer so it runs as
-- the function owner regardless.
grant execute on function assign_booking_atomic(uuid, uuid, uuid[], text) to authenticated;
