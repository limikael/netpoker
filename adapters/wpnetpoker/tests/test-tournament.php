<?php

use wpnetpoker\Tournament;
use wpnetpoker\TournamentRegistration;
use wpnetpoker\NetPokerPlugin;

class TournamentTest extends WP_UnitTestCase {

	function test_register() {
		NetPokerPlugin::init()->activate();

		$tournament=new Tournament();
		$tournament->fee=100;
		$tournament->commission=20;
		$tournament->save();
		$tournamentId=$tournament->id;

		$user_id = $this->factory->user->create();
		$user=get_user_by("id",$user_id);

		$tournament->registerUser($user);

		$t=Tournament::findOne($tournamentId);
		$balance=NetPokerPlugin::init()->getEntityBalance("ply",$user);

		$this->assertEquals(880,$balance);
		$this->assertTrue($t->isUserRegistered($user));
	}

/*	function test_something() {
		$tournament=new Tournament();
		$tournament->title="My tournament";
		$tournament->title="My tournament";

		$tournament->save();
	}*/
}

