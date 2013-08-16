<?php

namespace Hexmedia\AdministratorBundle\Menu;

use Symfony\Component\EventDispatcher\Event as EventAbstract;
use Knp\Menu\MenuItem;

class Event extends EventAbstract {

	/**
	 *
	 * @var MenuItem
	 */
	private $menu;

	public function __construct(MenuItem $menu) {
		$this->menu = $menu;
	}

	/**
	 *
	 * @return MenuItem
	 */
	public function getMenu() {
		return $this->menu;
	}

}

?>
