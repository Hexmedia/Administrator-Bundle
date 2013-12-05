<?php

namespace Hexmedia\AdministratorBundle\Menu;

use Knp\Menu\FactoryInterface;
use Knp\Menu\Item as MenuItem;
use Symfony\Component\Security\Core\SecurityContextInterface;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\Translation\TranslatorInterface as Translator;

class Builder {

	const MENU_BUILD_EVENT = 'menu.menu_build_event';

	/**
	 * @var FactoryInterface
	 */
	private $factory;

	/**
	 *
	 * @var MenuItem
	 */
	private $menu;

	/**
	 *
	 * @var Translator
	 */
	private $translator;

	/**
	 *
	 * @var EventDispatcherInterface
	 */
	private $eventDispatcher;

	/**
	 * @var SecurityContextInterface
	 */
	private $securityContext;

	public function __construct(EventDispatcherInterface $eventDispatcher, FactoryInterface $factory, SecurityContextInterface $securityContext, Translator $translator) {
		$this->factory = $factory;
		$this->securityContext = $securityContext;
		$this->translator = $translator;
		$this->eventDispatcher = $eventDispatcher;
	}

	public function createMainMenu() {
		$this->menu = $this->factory->createItem('root');

		$this->addDashboard();

		$this->eventDispatcher->dispatch(self::MENU_BUILD_EVENT, new Event($this->menu));

		$this->addConfiguration();

		return $this->menu;
	}

	private function addDashboard() {
		$this->menu->addChild($this->translator->trans('Dashboard'), array('route' => 'HexMediaDashboard'))->setAttribute('icon', 'fa fa-desktop');
	}

	private function addConfiguration() {
		if ($this->securityContext->isGranted("ROLE_SUPER_ADMIN")) {
			$configuration = $this->menu->addChild($this->translator->trans('Configuration'), array('route' => 'HexMediaConfigurationDisplay'))->setAttribute('icon', 'fa fa-cogs');
//			$configuration->addChild($this->translator->trans("List"), array('route' => 'HexMediaConfigurationDisplay'));
			$configuration->addChild($this->translator->trans("Add"), array('route' => 'HexMediaConfigurationAdd'));
		}
	}

}

?>
