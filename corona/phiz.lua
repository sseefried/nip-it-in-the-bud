
local i,j,p,r
local gravity = {x = 0, y = 0}
local particles = {}
local numBalls = 0
local ballradius = 20

local dead = 0


local function clamp(var, min, max)
	if var > max then
		var = max
	elseif var < min then
		var = min
	end
	return var
end

local function create(parent)

	local len = #particles + 1

	if len > 500 then
		print("too many particles!!!", len)
		return nil
	end


	local file = "rock.png"
	local ball = display.newGroup()
	local image = display.newImage(file)

	ball:insert(image)
	bounce:insert(ball)

	image.x,image.y = 0,0

	ball.index = len	

	ball.scale = 0.5 + math.random() * 1

	ball.running = true
	ball.sx = 15
	ball.sy = 15

	ball.xScale = ball.scale
	ball.yScale = ball.scale
	ball.radius = ballradius * ball.scale

	-- this algorithm is flawed, random position will tend towards the centre of the petridish
	local angle = math.random() * math.pi * 2
	local radius = math.random() * 50

	-- this creates a nice spiral creation format
	-- local angle = numBalls * 0.5
	-- local radius = (20 + numBalls * 2)

	local xp = math.sin(angle) * radius
	local yp = math.cos(angle) * radius

	ball.x = sw / 2 + xp
	ball.y = sh / 2 + yp
	ball.vx = (math.random( ) - 0.5) * 0.1
	ball.vy = (math.random( ) - 0.5) * 0.1
	ball.v = 0
	-- currently r (rotation) and rv (rotation velocity) are doing nothing
	ball.r = math.random( ) * 360
	ball.rv = (math.random( ) * 6 - 3)

	ball.splitradius = 20 + math.random(40)
	ball.kids = math.random(4) + 1


	-- copy props from parent if parent...
	if parent then
		for k,v in pairs(parent) do
			ball[k] = v
		end
	end

	-- this draws a debug circle to show when the ball will split
	local circle = display.newCircle(ball, 0, 0, ball.splitradius)
	circle:setFillColor(0, 0, 0, 0)
	circle:setStrokeColor(1, 0, 1, 0.2)
	circle.strokeWidth = 2

	-- more debug
	display.newText(ball, ball.kids, 0, 0, native.systemFont, 20 )

	-- every frame velocity calculation
	function ball:move(e)
		ball.vx = ball.vx + gravity.x
		ball.vy = ball.vy + gravity.y
		ball.x = ball.x + ball.vx
		ball.y = ball.y + ball.vy
		ball.r = ball.r + ball.rv
		ball.r = ball.r % 360
		ball.rotation = ball.r * 5

		-- ball.vx = clamp(ball.vx, -1, 1)
		-- ball.vy = clamp(ball.vy, -1, 1)

		-- damping
		ball.vx = ball.vx * 0.99
		ball.vy = ball.vy * 0.99
		ball.rv = ball.rv * 0.99
	end

	-- every frame pull ball towards center of dish
	-- gravity (ie accelerometer) should be added in here
	function ball:center()
		local dx = ball.x - sw / 2
		local dy = ball.y - sh / 2
		local d = math.sqrt( dx * dx + dy * dy )
		local distanceToEdge = d + ball.radius


		local angle = -math.atan(dy/dx) + math.pi / 2
	 	if dx < 0 then angle = angle - math.pi end
		if angle < 0 then angle = angle + math.pi * 2 end

		local sector = math.floor(angle / (math.pi * 2) * sectors) + 1

		-- local xp = math.sin(angle) * d
		-- local yp = math.cos(angle) * d
		-- display.newLine(lines, sw/2, sh/2, sw/2 + xp, sh/2 + yp)
		-- display.newText(lines, math.round(angle * 10) / 10 .. ":" .. sector, ball.x, ball.y, native.systemFont, 13 )

		-- i started trying to decouple petridish from this physics (hence the dispatchEvent below) but it's not complete
		if petridish.radius - distanceToEdge < 0 then
			-- you are fucking dead.
			petridish:smash(sector)
			balls.stop()
			Runtime:dispatchEvent({name = "gamestate", gamestate = "dead"})
		elseif petridish.radius - distanceToEdge < 10 then
			-- warn the user they are about to die
			petridish:warning(sector)
		end

		local g = 1 / 1000 -- g is pull to center
		local unitX = dx * g
		local unitY = dy * g
		ball.vx = ball.vx - unitX -- * ball.v
		ball.vy = ball.vy - unitY -- * ball.v

	end

	-- i'm not sure if velocity is important anymore since unit vectors are being used everywhere
	function ball:velocity()
		ball.v = math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy)
	end

	-- function ball:impact()
	-- 	ball.rv = (math.random( ) * 6 - 3)
	-- end

	-- this was a cool effect that make everything scatter, not implemented fully
	function ball:explode()
		local dir
		if math.random() > 0.5 then
			dir = -1
		else
			dir = 1
		end
		ball.vx = dir * (5 + math.random( ) * 2)
		ball.vy = dir * (5 + math.random( ) * 2)
		ball.rv = (math.random( ) * 6 - 3)
	end


	function ball:grow()
		ball.radius = ball.radius + 0.1
		ball.scale = ball.radius / ballradius

		-- ball.scale = ball.scale * 1.01
		-- ball.radius = ballradius * ball.scale

		ball.xScale = ball.scale
		ball.yScale = ball.scale

		circle.xScale = 1 / ball.scale
		circle.yScale = 1 / ball.scale

		if ball.radius > ball.splitradius then

			-- ball.radius = ball.splitradius

			local xp, yp, radius, kids = ball.x, ball.y, ball.radius / 2, ball.kids
			local splitradius = ball.splitradius

			ball:kill()

			local c = 0
			while c < kids do
				-- distribute new kids in evenly within the parents space
				local angle = c / kids * math.pi * 2
				local x = xp + math.sin(angle) * radius
		 		local y = yp + math.cos(angle) * radius

		 		-- delay creation of each kid... this could be randomised
				timer.performWithDelay(50 + c * 10, function()

					create({
						scale = 1,
						x = x,
						y = y,
						kids = kids,
						splitradius = splitradius
					})

				end, 1 )
				c = c + 1
			end

		end

	end

	-- i'm pretty sure this in between function is better than calling kill directly.
	function removeBody( event )
		local t = event.target
		local phase = event.phase
		if "began" == phase then
			ball:kill()
		end
		return true
	end

	-- at this stage killing a ball is not removing it from the particle array.
	-- this maybe should happen, but perhaps particles can be recycled from the array
	-- which is a common game technique... object pooling
	function ball:kill()
		if ball.running then
			print('ball kill', ball.index)
			ball.running = false
			ball:removeEventListener( "touch", removeBody )
			ball:removeSelf()

			-- stack dead balls in a grid off stage, this is the foundation of a progress bar or something similar
			-- dead = dead + 1
			-- ball.x = 10 + (dead % 20) * 10
			-- ball.y = 10 + math.floor(dead / 20) * 10
			-- ball.xScale = 0.2
			-- ball.yScale = 0.2

		else
			-- i found sometimes ball kill was being called twice, i think this bug is removed
			print("!!!!!!!!!!!! this shouldn't happen... ball is nil!!!", ball)
		end
	end

	particles[ len ] = ball
	numBalls = len + 1

	ball:addEventListener( "touch", removeBody )

	Runtime:dispatchEvent({name = "count",count = numBalls})

end


local function addBody(event)
	local t = event.target
	local phase = event.phase
	if "began" == phase then
		-- for i,k in pairs(event) do
		-- 	print("addBody", i,k)
		-- end
		-- print("addBody", eve.x, t.y)
		create({scale = 0.5, x = event.x, y = event.y})
	end
	return true
end











local function gameLoop(e)

	if balls.running then

		petridish:reset()

		if lines.numChildren then
			for i = lines.numChildren, 1, -1 do
				lines[i]:removeSelf()
			end
		end




		local totalRunning = 0
		i = 1
		while i < numBalls do

			p = particles[ i ]

			if p.running then

				p:move()
				p:grow()
				p:center()

				j = i + 1
				while j < numBalls do

					r = particles[ j ]

					if r.running then

						local combinedRadii = p.radius + r.radius

						local dx = p.x - r.x
						local dy = p.y - r.y
						local d = math.sqrt( dx * dx + dy * dy )

						if d < combinedRadii then

							-- display.newLine(lines, p.x, p.y, r.x, r.y)

							p:velocity( )
							r:velocity( )

							local unitX = dx / d -- + math.random() * 0.5 - 0.25
							local unitY = dy / d -- + math.random() * 0.5 - 0.25

							p.vx = p.vx + unitX * 0.1 -- * (combinedRadii - d)
							p.vy = p.vy + unitY * 0.1 -- * (combinedRadii - d)
							r.vx = r.vx - unitX * 0.1 -- * (combinedRadii - d)
							r.vy = r.vy - unitY * 0.1 -- * (combinedRadii - d)

							-- local mS = 1 --combinedRadii * 0.1
							-- p.vx = clamp(p.vx + unitX * r.v, -mS, mS)
							-- p.vy = clamp(p.vy + unitY * r.v, -mS, mS)
							-- r.vx = clamp(r.vx - unitX * p.v, -mS, mS)
							-- r.vy = clamp(r.vy - unitY * p.v, -mS, mS)

							-- p:impact()
							-- r:impact()
						end
					end

					j = j + 1

				end

			else

				totalRunning = totalRunning + 1
				if totalRunning == numBalls then
					balls.dead()
				end

			end

			i = i + 1
		end

	else
		print('game over')
	end

end



-- the accelerometer has not been implemented/tested
local acc = {}
acc.indicator = display.newCircle(0,0,10)
acc.indicator:setFillColor(1,1,1,0.5)
acc.indicator.x, acc.indicator.y = sw / 2, sh / 2

function accelerometer(e)
	-- this code should make the central circle move around akin to joystick to show gravity
	-- debugging only...
	acc.indicator.x = centerX + (centerX * e.xGravity)
	acc.indicator.y = centerY + (centerY * -e.yGravity)
	gravity.x = e.xGravity * 1.5
	gravity.y = -e.yGravity * 1.5
	--acc.info.text = "x:" .. math.round(gravity.x*100)/100 .. "y:" .. math.round(gravity.y*100)/100
end





balls = {
	running = false,

	create = function(level)
		print('balls creating level:', level.initial)
		for i = 1,level.initial,1 do
			create(level.germ)
		end

		-- delay spawning of germs at the start of the level
		-- dropGermsTimer = timer.performWithDelay(1000, function()
		-- 	for i = 0, 2 do
				create({scale = 0.5})
		-- 	end
		-- end, 25 )

	end,

	start = function()
		print('balls starting')
		balls.running = true

		Runtime:addEventListener("enterFrame", gameLoop)
		-- Runtime:addEventListener("accelerometer", accelerometer)
		-- this is cool: create a new germ if you miss.
		-- ie, "you're grubby finger made a new germ"
		bg:addEventListener( "touch", addBody )

	end,

	stop = function()
		print('balls stopping')
		Runtime:removeEventListener("enterFrame", gameLoop)
		-- Runtime:removeEventListener("accelerometer", accelerometer)
		bg:removeEventListener( "touch", addBody )
		balls.running = false
	end,

	reset = function()
		print('resetting')
		for i = 1,numBalls,1 do
			p = particles[ i ]
			if p then p:kill() end
		end
		particles = {}
		numBalls = 0
		Runtime:dispatchEvent({name = "count",count = numBalls})
	end,

	explode = function ()
		for i = 1,numBalls,1 do
			p = particles[ i ]
			p:explode( )
		end
	end,

}


