os.execute('clear')
sw,sh = display.contentWidth, display.contentHeight
display.setStatusBar( display.HiddenStatusBar )
system.activate( "multitouch" )

bg = display.newGroup()
lines = display.newGroup()
bounce = display.newGroup()

-- local rect = display.newRect(bg, sw/2, sh/2, sw, sh)
-- rect:setFillColor(1, 0, 0, 0.2)

sectors = 40

require("ui")
require("phiz")
require("petridish")
require("levels")


Runtime:addEventListener("newlevel", function(e)
	balls.stop()
	balls.reset()
	timer.performWithDelay(200, function()
		local level = levels[e.newlevel]
		balls.create(level)
		balls.start()
	end, 1 )
end )

