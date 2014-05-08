function createPetridish ()
	local p = display.newGroup()
	if sw < sh then
		p.radius = sw / 2
	else
		p.radius = sh / 2
	end
	p.edges = {}

	for i = 1, sectors,1 do
		-- print(i)
		local angle0, angle1 = (i - 1) / sectors * math.pi * 2, i / sectors * math.pi * 2
		function point(a) return sw / 2 + math.sin(a) * p.radius, sh / 2 + math.cos(a) * p.radius end
		local x0, y0 = point(angle0)
		local x1, x2 = point(angle1)
		local l = display.newLine(p, x0, y0, x1, x2)
		l.origin = {x = l.x, y = l.y}
		p.edges[i] = l
		print(i, l.x, l.y)
	end

	function p:reset()
		for i = 1, sectors,1 do
			local edge = p.edges[i]
			edge:setStrokeColor(1, 1, 1, 1 )
			edge.strokeWidth = 2
			edge.rotation = 0
			edge.x = edge.origin.x
			edge.y = edge.origin.y
		end
	end
	p:reset()

	function p:warning(sector)
		local l = p.edges[sector]
		l:setStrokeColor( 1, 0, 0, 1 )
		l.strokeWidth = 6
	end

	function smash(edge, amount)
		edge.rotation = edge.rotation + (math.random() * 20 - 10) * amount
		edge.x = edge.x + (math.random() * 10 - 5) * amount
		edge.y = edge.y + (math.random() * 10 - 5) * amount
		edge.strokeWidth = amount + 1
	end

	function p:smash(sector)
		for s = sector - 4, sector + 4, 1 do
			smash(p.edges[(s + sectors) % sectors + 1], 5 - math.abs(sector - s))
		end
	end

	print(sw / 2, sh / 2, p.radius)

	local circle = display.newCircle(bg, sw / 2, sh / 2, p.radius)
	circle:setFillColor(1, 0, 200, 0.2)

	return p
end

petridish = createPetridish()
